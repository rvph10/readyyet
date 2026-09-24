// Railway's edge sets this to the address the connection came from,
// replacing any value the client sent (ADR 0025). The socket address
// itself is Railway's proxy, shared by every client.
export const CLIENT_IP_HEADER = "x-real-ip";
