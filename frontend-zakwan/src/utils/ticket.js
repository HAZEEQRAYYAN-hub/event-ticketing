// Helpers for ticket QR codes.
//
// The backend asks the QR Server API (api.qrserver.com) for a QR code when a
// booking is made, using the text "BOOKING-<booking id>-EVENT-<event id>".
// The backend does not save that QR code, so to show it again later we ask
// the same API for the same text. Same text = same QR code.

export function getTicketCode(booking) {
  return `BOOKING-${booking.id}-EVENT-${booking.event_id}`
}

export function getQrImageUrl(booking, size = 220) {
  const text = encodeURIComponent(getTicketCode(booking))
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${text}`
}
