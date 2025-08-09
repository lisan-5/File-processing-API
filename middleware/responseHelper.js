// Response helper for consistent API responses
class ResponseHelper {
  // Success response
  static success(res, data = null, message = 'Success', statusCode = 200) {
    return res.status(statusCode).json({
      success: true,
      message,
      data,
      timestamp: new Date().toISOString()
    });
  }

  // Error response
  static error(res, message = 'Error occurred', statusCode = 500, errors = null) {
    return res.status(statusCode).json({
      success: false,
      message,
      errors,
      timestamp: new Date().toISOString()
    });
  }

  // Paginated response
  static paginated(res, data, page, limit, total, message = 'Data retrieved successfully') {
    const totalPages = Math.ceil(total / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    return res.status(200).json({
      success: true,
      message,
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage,
        hasPrevPage,
        nextPage: hasNextPage ? page + 1 : null,
        prevPage: hasPrevPage ? page - 1 : null
      },
      timestamp: new Date().toISOString()
    });
  }

  // Created response
  static created(res, data, message = 'Resource created successfully') {
    return this.success(res, data, message, 201);
  }

  // No content response
  static noContent(res) {
    return res.status(204).send();
  }

  // Bad request response
  static badRequest(res, message = 'Bad request', errors = null) {
    return this.error(res, message, 400, errors);
  }

  // Unauthorized response
  static unauthorized(res, message = 'Unauthorized') {
    return this.error(res, message, 401);
  }

  // Forbidden response
  static forbidden(res, message = 'Forbidden') {
    return this.error(res, message, 403);
  }

  // Not found response
  static notFound(res, message = 'Resource not found') {
    return this.error(res, message, 404);
  }

  // Conflict response
  static conflict(res, message = 'Resource conflict') {
    return this.error(res, message, 409);
  }

  // Too many requests response
  static tooManyRequests(res, message = 'Too many requests') {
    return this.error(res, message, 429);
  }

  // Internal server error response
  static internalError(res, message = 'Internal server error') {
    return this.error(res, message, 500);
  }

  // Service unavailable response
  static serviceUnavailable(res, message = 'Service temporarily unavailable') {
    return this.error(res, message, 503);
  }
}

module.exports = ResponseHelper;
