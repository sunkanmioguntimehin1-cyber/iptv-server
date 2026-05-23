const success = (res, data = {}, message = 'Success', statusCode = 200) =>
  res.status(statusCode).json({ success: true, message, data });

const created = (res, data = {}, message = 'Created') =>
  success(res, data, message, 201);

const error = (res, message = 'Error', statusCode = 500, errors = []) =>
  res.status(statusCode).json({ success: false, message, errors });

module.exports = { success, created, error };
