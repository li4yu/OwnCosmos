-- Phase 17: 既有账号回填为已验证，避免上线闸门后全体锁在验证页
UPDATE "user" SET "email_verified" = true WHERE "email_verified" = false;
