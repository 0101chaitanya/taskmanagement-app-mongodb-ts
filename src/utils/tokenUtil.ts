import {ApiError} from "./apiError.ts";
import type {AccessAndRefreshTokens} from "../types/types.ts";
import {User} from "../models/user.model.ts";
import {Types} from "mongoose";

export const generateAccessAndRefreshTokens = async (
    userId: Types.ObjectId | string,
): Promise<AccessAndRefreshTokens> => {
    try {
        const user = await User.findById(userId);

        if (!user) {
            throw new ApiError(404, "User not found");
        }

        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        user.refreshToken = refreshToken;
        await user.save({validateBeforeSave: false});

        return {accessToken, refreshToken};
    } catch (error) {
        if (error instanceof ApiError) throw error;
        throw new ApiError(
            500,
            "Something went wrong while generating access token",
        );
    }
};
export const cookieOptions = {
    httpOnly: true,
    secure: true,
};
