-- Adds the admin approval step to an EXISTING ticketing database.
-- Run once in phpMyAdmin: click "ticketing" on the left, open the SQL tab, paste, Go.
-- (A fresh install from schema.sql already has this column.)

ALTER TABLE bookings
  ADD COLUMN approval_status ENUM('pending','approved') NOT NULL DEFAULT 'pending' AFTER status;

-- Bookings made before this change were already treated as final, so mark them approved
UPDATE bookings SET approval_status = 'approved';

-- To undo:  ALTER TABLE bookings DROP COLUMN approval_status;
