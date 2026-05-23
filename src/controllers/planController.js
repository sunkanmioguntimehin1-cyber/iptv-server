const Plan     = require('../models/Plan');
const ApiError = require('../utils/ApiError');
const { success } = require('../utils/response');

// ─── GET /api/plans ───────────────────────────────────────────────────────────
exports.getPlans = async (req, res) => {
  const plans = await Plan.find({ isActive: true }).sort({ price: 1 });
  return success(res, { plans });
};

// ─── GET /api/plans/:id ───────────────────────────────────────────────────────
exports.getPlan = async (req, res) => {
  const plan = await Plan.findById(req.params.id);
  if (!plan) throw ApiError.notFound('Plan not found');
  return success(res, { plan });
};
