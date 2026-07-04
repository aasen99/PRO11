-- Cookie consent logging for PRO11 (accept/decline analytics for admin)
CREATE TABLE IF NOT EXISTS cookie_consent_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  decision VARCHAR(20) NOT NULL CHECK (decision IN ('accepted', 'declined')),
  language VARCHAR(10),
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cookie_consent_events_decision ON cookie_consent_events(decision);
CREATE INDEX IF NOT EXISTS idx_cookie_consent_events_created_at ON cookie_consent_events(created_at DESC);
