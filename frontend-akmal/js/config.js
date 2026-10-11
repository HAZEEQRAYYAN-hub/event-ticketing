/* config.js
   The only file you need to edit to run this frontend on another machine. */

const CONFIG = {
  // Where the shared backend is running.
  API_URL: 'http://localhost:3000/api',

  // Must be the same value as API_KEY in backend/.env
  API_KEY: 'myticket123',

  // Shown in the footer so the marker can see whose frontend this is.
  OWNER: { name: 'YOUR NAME', studentId: 'YOUR STUDENT ID' },

  // Rows per page on the Events and Venues screens.
  PAGE_SIZE: 5
};

