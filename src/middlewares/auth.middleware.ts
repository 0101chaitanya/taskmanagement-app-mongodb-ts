import type {NextFunction, Request, Response} from "express";
import {asyncHandler} from "../utils/asyncHandler.ts";
import {ApiError} from "../utils/apiError.ts";
import {User} from "../models/user.model.ts";
import type {DecodedAccessToken} from "../types/types.ts";
import jwt from "jsonwebtoken";

export const verifyJWT = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
        console.log(req.cookies)
        const token =
            req.cookies?.accessToken
        // ||
        // req.header("Authorization")?.replace("Bearer ", "");

        if (!token) {
            throw new ApiError(401, "Unauthorized request");
        }

        try {
            const decodedToken = jwt.verify(
                token,
                process.env.ACCESS_TOKEN_SECRET as string,
            ) as DecodedAccessToken;

            const user = await User.findById(decodedToken?._id).select(
                `-password -refreshToken -emailVerificationToken -emailVerificationExpiry`,
            );

            if (!user) {
                throw new ApiError(401, "Invalid access token");
            }

            req.user = user;
            next();
        } catch (error) {
            if (error instanceof ApiError) throw error;
            throw new ApiError(401, "Invalid access token");
        }
    },
);
