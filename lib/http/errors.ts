// Lets a shared route-logic function signal "400 bad input" or "404 not
// found" distinctly from "500 something broke", while GET and POST
// handlers share one catch block that maps it to the right status.
export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "HttpError";
    this.status = status;
  }
}
