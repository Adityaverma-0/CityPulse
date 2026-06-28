export function generateTicketId(): string {
  const num = Math.floor(10000 + Math.random() * 90000);
  return `CH-${num}`;
}
