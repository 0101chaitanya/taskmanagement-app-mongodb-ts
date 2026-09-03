import {asyncHandler} from "../utils/asyncHandler.ts";
import {
    getMailgenContentForEmailVerification,
    getMailgenContentForForgotPassword,
    sendEmail
} from "../utils/mail.ts";
import {ApiResponse} from "../utils/apiResponse.ts";
import {ApiError} from "../utils/apiError.ts";
import type {Request, Response} from "express";
import {User} from "../models/user.model.ts";
import {
    cookieOptions,
    generateAccessAndRefreshTokens
} from "../utils/tokenUtil.ts";
import type {
    DecodedToken,
    LoginBody,
    RegisterUserBody,
    ResetForgotPasswordParams,
    VerifyEmailParams
} from "../types/types.ts";
import jwt from "jsonwebtoken";
import {createHash} from "crypto";


const registerUser = asyncHandler(
    async (req: Request, res:
    Response) => {
        const {email, username, password}: RegisterUserBody = req.body;

        if (!email || !username || !password) {
            throw new ApiError(400, "All fields are required");
        }

        const existedUser = await User.findOne({
            $or: [{username}, {email}],
        });

        if (existedUser) {
            throw new ApiError(409, `User with email or username already exists`, []);
        }

        const user = await User.create({
            email,
            password,
            username,
            isEmailVerified: false,
        });

        const {unHashedToken, hashedToken, tokenExpiry} =
            user.generateTemporaryToken();

        user.emailVerificationToken = hashedToken;
        user.emailVerificationExpiry = new Date(tokenExpiry);

        await user.save({validateBeforeSave: false});

        await sendEmail({
            email: user.email,
            subject: "Please verify your email",
            mailgenContent: getMailgenContentForEmailVerification(
                user.username,
                `${req.protocol}://${req.get("host")}/api/v1/auth/verify-email/${unHashedToken}`,
            ),
        });

        const createdUser = await User.findById(user._id)
            .select(
                `-password -refreshToken -emailVerificationToken -emailVerificationExpiry`,
            );


        if (!createdUser) {
            throw new ApiError(500, "Something went wrong while registering a" +
                " user");
        }

        return res
            .status(201)
            .json(
                new ApiResponse(
                    201,
                    {
                        user: {
                            ...createdUser.toJSON(),
                            emailVerificationToken: unHashedToken
                        }
                    },
                    `User registered successfully and verification email has been sent on your email`,
                ),
            );
    },
);


const login = asyncHandler(
    async (req: Request, res: Response) => {
        const {email, password}: LoginBody = req.body;

        if (!email || !password) {
            throw new ApiError(400, "Email and password are required");
        }

        const user = await User.findOne({email});

        if (!user) {
            throw new ApiError(400, "User does not exist");
        }

        const isPasswordValid = await user.isPasswordCorrect(password);

        if (!isPasswordValid) {
            throw new ApiError(400, "Invalid credentials");
        }

        const {
            accessToken,
            refreshToken
        } = await generateAccessAndRefreshTokens(
            user._id,
        );

        const loggedInUser = await User.findById(user._id).select(
            `-password -refreshToken -emailVerificationToken -emailVerificationExpiry`,
        );

        res.cookie("accessToken", accessToken, cookieOptions)
        res.cookie("refreshToken", refreshToken, cookieOptions)

        return res
            .status(200)
            .json(
                new ApiResponse(
                    200,
                    {
                        user: loggedInUser,
                        accessToken,
                        refreshToken,
                    },
                    "User logged in successfully",
                ),
            );
    },
);

const logoutUser = asyncHandler(
    async (req: Request, res: Response) => {
        if (!req.user?._id) {
            throw new ApiError(401, "Unauthorized request");
        }

        await User.findByIdAndUpdate(
            req.user._id,
            {
                $set: {
                    refreshToken: "",
                },
            },
            {
                new: true,
            },
        );

        return res
            .status(200)
            .clearCookie("accessToken", cookieOptions)
            .clearCookie("refreshToken", cookieOptions)
            .json(new ApiResponse(200, {}, "User logged out"));
    },
);

//


const getCurrentUser = asyncHandler(
    async (req: Request, res: Response) => {
        return res
            .status(200)
            .json(
                new ApiResponse(200, req.user, "Current user fetched successfully"),
            );
    },
);

const verifyEmail = asyncHandler(
    async (req: Request, res: Response) => {
        const {verificationToken}: VerifyEmailParams = req.params;

        if (!verificationToken) {
            throw new ApiError(400, "Email verification token is missing");
        }

        const hashedToken = createHash("sha256")
            .update(verificationToken)
            .digest("hex");

        const user = await User.findOne({
            emailVerificationToken: hashedToken,
            emailVerificationExpiry: {$gt: new Date()},
        });

        if (!user) {
            throw new ApiError(400, "Token is invalid or expired");
        }

        user.emailVerificationToken = undefined;
        user.emailVerificationExpiry = undefined;
        user.isEmailVerified = true;

        await user.save({validateBeforeSave: false});

        return res.status(200).json(
            new ApiResponse(
                200,
                {
                    isEmailVerified: true,
                },
                "Email is verified",
            ),
        );
    },
);

const resendEmailVerification = asyncHandler(
    async (req: Request, res: Response) => {
        const user = await User.findById(req.user?._id);

        if (!user) {
            throw new ApiError(404, "User does not exist");
        }
        if (user.isEmailVerified) {
            throw new ApiError(409, "Email is already verified");
        }

        const {unHashedToken, hashedToken, tokenExpiry} =
            user.generateTemporaryToken();

        user.emailVerificationToken = hashedToken;
        user.emailVerificationExpiry = new Date(tokenExpiry);

        await user.save({validateBeforeSave: false});

        await sendEmail({
            email: user.email,
            subject: "Please verify your email",
            mailgenContent: getMailgenContentForEmailVerification(
                user.username,
                `${req.protocol}://${req.get("host")}/api/v1/auth/verify-email/${unHashedToken}`,
            ),
        });

        return res
            .status(200)
            .json(new ApiResponse(200, {}, "Mail has been sent to your email ID"));
    },
);

const refreshAccessToken = asyncHandler(
    async (req: Request, res: Response) => {
        const incomingRefreshToken: string | undefined =
            req.cookies?.refreshToken || req.body?.refreshToken;
        console.log(`Refresh Token for ${incomingRefreshToken}`);
        if (!incomingRefreshToken) {
            throw new ApiError(401, "Unauthorized access");
        }

        try {
            const decodedToken = jwt.verify(
                incomingRefreshToken,
                process.env.REFRESH_TOKEN_SECRET as string,
            ) as DecodedToken;
            console.log(decodedToken);
            const user = await User.findById(decodedToken?._id);
            if (!user) {
                throw new ApiError(401, "Invalid refresh token");
            }

            if (incomingRefreshToken !== user.refreshToken) {
                throw new ApiError(401, "Refresh token is expired or invalid");
            }

            const {accessToken, refreshToken: newRefreshToken} =
                await generateAccessAndRefreshTokens(user._id);

            user.refreshToken = newRefreshToken;
            await user.save();

            return res
                .status(200)
                .cookie("accessToken", accessToken, cookieOptions)
                .cookie("refreshToken", newRefreshToken, cookieOptions)
                .json(
                    new ApiResponse(
                        200,
                        {accessToken, refreshToken: newRefreshToken},
                        "Access token refreshed",
                    ),
                );
        } catch (error) {
            if (error instanceof ApiError) throw error;
            console.error(error);
            throw new ApiError(401, "Invalid refresh token");
        }
    },
);

const forgotPasswordRequest = asyncHandler(
    async (req: Request, res: Response) => {
        const {email} = req.body;

        if (!email) {
            throw new ApiError(400, "Email is required");
        }

        const user = await User.findOne({email});

        if (!user) {
            throw new ApiError(404, "User does not exist", []);
        }

        const {unHashedToken, hashedToken, tokenExpiry} =
            user.generateTemporaryToken();

        user.forgotPasswordToken = hashedToken;
        user.forgotPasswordExpiry = new Date(tokenExpiry);

        await user.save({validateBeforeSave: false});

        await sendEmail({
            email: user.email,
            subject: "Password reset request",
            mailgenContent: getMailgenContentForForgotPassword(
                user.username,


                /*`${process.env.FORGOT_PASSWORD_REDIRECT_URL}/${unHashedToken}`,*/
                `${req.protocol}://${req.get("host")}/api/v1/auth/forgot-password/${unHashedToken}`
            ),
        });

        return res
            .status(200)
            .json(
                new ApiResponse(
                    200,
                    {},
                    "Password reset mail has been sent on your mail id",
                ),
            );
    },
);

const resetForgotPassword = asyncHandler(
    async (
        req: Request,
        res: Response,
    ) => {
        const {resetToken}: ResetForgotPasswordParams = req.params;
        const {newPassword} = req.body;

        if (!resetToken) {
            throw new ApiError(400, "Reset token is missing");
        }
        if (!newPassword) {
            throw new ApiError(400, "New password is required");
        }

        const hashedToken = createHash("sha256")
            .update(resetToken)
            .digest("hex");

        const user = await User.findOne({
            forgotPasswordToken: hashedToken,
            forgotPasswordExpiry: {$gt: new Date()},
        });

        if (!user) {
            throw new ApiError(400, "Token is invalid or expired");
        }

        user.forgotPasswordExpiry = undefined;
        user.forgotPasswordToken = undefined;
        user.password = newPassword;

        await user.save({validateBeforeSave: false});

        return res
            .status(200)
            .json(new ApiResponse(200, {}, "Password reset successfully"));
    },
);

const changeCurrentPassword = asyncHandler(
    async (
        req: Request,
        res: Response,
    ) => {
        const {oldPassword, newPassword} = req.body;

        if (!oldPassword || !newPassword) {
            throw new ApiError(400, "Both old password and new password are required");
        }

        const user = await User.findById(req.user?._id);

        if (!user) {
            throw new ApiError(404, "User not found");
        }

        const isPasswordValid = await user.isPasswordCorrect(oldPassword);

        if (!isPasswordValid) {
            throw new ApiError(400, "Invalid old Password");
        }

        user.password = newPassword;
        await user.save({validateBeforeSave: false});

        return res
            .status(200)
            .json(new ApiResponse(200, {}, "Password changed successfully"));
    },
);

export {
    registerUser,
    login,
    logoutUser,
    getCurrentUser,
    verifyEmail,
    resendEmailVerification,
    refreshAccessToken,
    forgotPasswordRequest,
    changeCurrentPassword,
    resetForgotPassword,
};


