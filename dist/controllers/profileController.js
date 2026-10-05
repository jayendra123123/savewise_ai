"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProfileController = void 0;
const profileService_1 = require("../services/profileService");
const profileValidators_1 = require("../validators/profileValidators");
const apiResponse_1 = require("../utils/apiResponse");
class ProfileController {
    static async getProfile(req, res, next) {
        try {
            const profile = await profileService_1.ProfileService.getProfile(req.user.userId);
            (0, apiResponse_1.sendSuccess)(res, profile, 'Profile fetched successfully');
        }
        catch (err) {
            next(err);
        }
    }
    static async updateProfile(req, res, next) {
        try {
            const validated = profileValidators_1.updateProfileSchema.parse(req.body);
            const profile = await profileService_1.ProfileService.updateProfile(req.user.userId, validated);
            (0, apiResponse_1.sendSuccess)(res, profile, 'Profile updated successfully');
        }
        catch (err) {
            next(err);
        }
    }
}
exports.ProfileController = ProfileController;
