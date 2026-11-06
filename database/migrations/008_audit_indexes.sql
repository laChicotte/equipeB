CREATE INDEX audit_event_cursor_idx ON audit_event(created_at DESC,id DESC);
CREATE INDEX audit_event_resource_cursor_idx ON audit_event(resource_type,created_at DESC,id DESC);
