INSERT INTO users (name,email,password_hash,role) VALUES
('Admin One','admin@demo.com','<PASTE_HASH>','admin'),
('Organiser One','org@demo.com','<PASTE_HASH>','organiser'),
('Customer One','cust1@demo.com','<PASTE_HASH>','customer'),
('Customer Two','cust2@demo.com','<PASTE_HASH>','customer'),
('Customer Three','cust3@demo.com','<PASTE_HASH>','customer');

INSERT INTO venues (name,address,city,capacity) VALUES
('Axiata Arena','Bukit Jalil','Kuala Lumpur',16000),
('Dewan Filharmonik','Petronas Twin Towers','Kuala Lumpur',920),
('Setia City Convention','Setia Alam','Shah Alam',3000),
('Penang Setia SPICE','Bayan Lepas','Penang',5000),
('Stadium Merdeka','Jalan Stadium','Kuala Lumpur',20000);

INSERT INTO events (title,description,venue_id,organiser_id,event_date,ticket_price,total_tickets,available_tickets) VALUES
('Rock Night','Live bands',1,2,'2026-12-01 20:00:00',120.00,500,500),
('Classical Evening','Orchestra',2,2,'2026-11-20 19:30:00',150.00,300,300),
('Tech Expo','Gadgets and talks',3,2,'2026-11-05 10:00:00',30.00,1000,1000),
('Food Festival','Street food',4,2,'2026-12-15 11:00:00',15.00,2000,2000),
('Charity Run','5km run',5,2,'2026-10-30 07:00:00',50.00,800,800);

INSERT INTO bookings (user_id,event_id,quantity,total_price) VALUES
(3,1,2,240.00),(3,3,1,30.00),(4,2,2,300.00),(4,4,4,60.00),(5,5,1,50.00);