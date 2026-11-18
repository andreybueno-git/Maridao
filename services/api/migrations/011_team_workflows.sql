\encoding UTF8
\set ON_ERROR_STOP on
\connect maridao
BEGIN;
ALTER TABLE maridao.accounts ADD COLUMN IF NOT EXISTS disabled_at timestamptz;
ALTER TABLE maridao.accounts ADD COLUMN IF NOT EXISTS email_verified_at timestamptz;
GRANT UPDATE(password_hash,disabled_at,email_verified_at) ON maridao.accounts TO maridao_api;
GRANT UPDATE(full_name,phone,neighborhood) ON maridao.customer_profiles TO maridao_api;
GRANT UPDATE(full_name,phone,categories,specialties,neighborhoods,availability) ON maridao.provider_profiles TO maridao_api;
CREATE TABLE IF NOT EXISTS maridao.service_reviews (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 request_id uuid NOT NULL UNIQUE REFERENCES maridao.service_requests(id),
 customer_id uuid NOT NULL REFERENCES maridao.accounts(id),
 provider_id uuid NOT NULL REFERENCES maridao.accounts(id),
 rating smallint NOT NULL CHECK(rating BETWEEN 1 AND 5),
 comment varchar(1000) NOT NULL DEFAULT '',
 created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX IF NOT EXISTS reviews_provider_date_idx ON maridao.service_reviews(provider_id,created_at,id);
CREATE TABLE IF NOT EXISTS maridao.chat_messages (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 request_id uuid NOT NULL REFERENCES maridao.service_requests(id),
 sender_id uuid NOT NULL REFERENCES maridao.accounts(id),
 client_id uuid NOT NULL,
 ciphertext text NOT NULL CHECK(ciphertext LIKE 'v1.%'),
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 UNIQUE(request_id,sender_id,client_id)
);
CREATE INDEX IF NOT EXISTS messages_request_id_idx ON maridao.chat_messages(request_id,id);
CREATE TABLE IF NOT EXISTS maridao.notifications (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 account_id uuid NOT NULL REFERENCES maridao.accounts(id),
 request_id uuid NOT NULL REFERENCES maridao.service_requests(id),
 title varchar(150) NOT NULL,
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 read_at timestamptz
);
CREATE INDEX IF NOT EXISTS notifications_account_id_idx ON maridao.notifications(account_id,id);
CREATE TABLE IF NOT EXISTS maridao.account_challenges (
 account_id uuid NOT NULL REFERENCES maridao.accounts(id),
 purpose varchar(20) NOT NULL CHECK(purpose IN ('password_reset','verify_email')),
 token_hash char(64) NOT NULL,
 expires_at timestamptz NOT NULL,
 attempts smallint NOT NULL DEFAULT 0 CHECK(attempts BETWEEN 0 AND 5),
 PRIMARY KEY(account_id,purpose)
);
REVOKE ALL ON maridao.service_reviews,maridao.chat_messages,maridao.notifications,maridao.account_challenges FROM PUBLIC;
GRANT SELECT,INSERT ON maridao.service_reviews,maridao.chat_messages TO maridao_api;
GRANT USAGE,SELECT ON SEQUENCE maridao.chat_messages_id_seq TO maridao_api;
GRANT SELECT ON maridao.notifications TO maridao_api;
GRANT UPDATE(read_at) ON maridao.notifications TO maridao_api;
GRANT SELECT,INSERT,UPDATE,DELETE ON maridao.account_challenges TO maridao_api;

-- Restricted trigger: writes only notification recipients derived from the order.
CREATE OR REPLACE FUNCTION maridao.notify_workflow() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE r record; recipient uuid; label text;
BEGIN
 IF TG_TABLE_NAME='service_requests' THEN
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN RETURN NEW; END IF;
  SELECT provider_id INTO recipient FROM maridao.proposals WHERE id=NEW.selected_proposal_id;
  INSERT INTO maridao.notifications(account_id,request_id,title) VALUES(NEW.customer_id,NEW.id,'Pedido atualizado: '||NEW.status);
  IF recipient IS NOT NULL THEN INSERT INTO maridao.notifications(account_id,request_id,title) VALUES(recipient,NEW.id,'Atendimento atualizado: '||NEW.status); END IF;
 ELSE
  SELECT s.customer_id,p.provider_id INTO r FROM maridao.service_requests s LEFT JOIN maridao.proposals p ON p.id=s.selected_proposal_id WHERE s.id=NEW.request_id;
  IF TG_TABLE_NAME='proposals' THEN
   IF TG_OP='INSERT' THEN label:='Nova proposta recebida';
   ELSIF NEW.status IS DISTINCT FROM OLD.status THEN label:='Proposta atualizada: '||NEW.status;
   ELSIF NEW.version IS DISTINCT FROM OLD.version THEN label:='Proposta editada'; ELSE RETURN NEW; END IF;
   INSERT INTO maridao.notifications(account_id,request_id,title) VALUES(r.customer_id,NEW.request_id,label);
   IF TG_OP='UPDATE' THEN INSERT INTO maridao.notifications(account_id,request_id,title) VALUES(NEW.provider_id,NEW.request_id,label); END IF;
  ELSIF TG_TABLE_NAME='chat_messages' THEN
   recipient:=CASE WHEN NEW.sender_id=r.customer_id THEN r.provider_id ELSE r.customer_id END;
   IF recipient IS NOT NULL THEN INSERT INTO maridao.notifications(account_id,request_id,title) VALUES(recipient,NEW.request_id,'Nova mensagem no atendimento'); END IF;
  END IF;
 END IF;
 RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION maridao.notify_workflow() FROM PUBLIC;
DROP TRIGGER IF EXISTS notify_request ON maridao.service_requests;
CREATE TRIGGER notify_request AFTER UPDATE OF status ON maridao.service_requests FOR EACH ROW EXECUTE FUNCTION maridao.notify_workflow();
DROP TRIGGER IF EXISTS notify_proposal ON maridao.proposals;
CREATE TRIGGER notify_proposal AFTER INSERT OR UPDATE ON maridao.proposals FOR EACH ROW EXECUTE FUNCTION maridao.notify_workflow();
DROP TRIGGER IF EXISTS notify_message ON maridao.chat_messages;
CREATE TRIGGER notify_message AFTER INSERT ON maridao.chat_messages FOR EACH ROW EXECUTE FUNCTION maridao.notify_workflow();
-- Serialize new work with account closure, including already authenticated requests.
CREATE OR REPLACE FUNCTION maridao.require_active_account() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE customer uuid;
BEGIN
 IF TG_TABLE_NAME='service_requests' THEN
  customer:=NEW.customer_id;
 ELSE
  PERFORM 1 FROM maridao.accounts WHERE id=NEW.provider_id AND disabled_at IS NULL FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Conta indisponível' USING ERRCODE='23514',CONSTRAINT='active_workflow_account'; END IF;
  SELECT customer_id INTO customer FROM maridao.service_requests WHERE id=NEW.request_id;
 END IF;
 PERFORM 1 FROM maridao.accounts WHERE id=customer AND disabled_at IS NULL FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Conta indisponível' USING ERRCODE='23514',CONSTRAINT='active_workflow_account'; END IF;
 RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION maridao.require_active_account() FROM PUBLIC;
DROP TRIGGER IF EXISTS active_request_account ON maridao.service_requests;
CREATE TRIGGER active_request_account BEFORE INSERT ON maridao.service_requests FOR EACH ROW EXECUTE FUNCTION maridao.require_active_account();
DROP TRIGGER IF EXISTS active_proposal_accounts ON maridao.proposals;
CREATE TRIGGER active_proposal_accounts BEFORE INSERT OR UPDATE ON maridao.proposals FOR EACH ROW EXECUTE FUNCTION maridao.require_active_account();
COMMIT;
