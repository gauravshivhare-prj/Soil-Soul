/**
 * Create an operational HTTP error with an HTTP status code and a machine-readable code.
 * When status < 500 and expose is true, the centralized error handler renders code and message.
 *
 * @param {number} status - HTTP status code (400-499)
 * @param {string} code - Machine-readable error code (e.g. 'VALIDATION_ERROR')
 * @param {string} message - Safe, user-facing error message
 * @returns {Error}
 */
export function createError(status, code, message) {
  const err = new Error(message);
  err.status = status;
  err.code = code;
  err.expose = true;
  return err;
}

export default createError;
