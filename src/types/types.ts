import type {IUserDocument} from "../models/user.model.ts";
import type {JwtPayload} from "jsonwebtoken";


export interface AccessAndRefreshTokens {
    accessToken: string;
    refreshToken: string;
}

export interface RegisterUserBody {
    email?: string;
    username?: string;
    password?: string;
    role?: string;
}

export interface LoginBody {
    email?: string;
    password?: string;
    username?: string;
}

export interface VerifyEmailParams {
    verificationToken?: string;
}

export interface ForgotPasswordBody {
    email?: string;
}

export interface ResetForgotPasswordParams {
    resetToken?: string;
}

export interface ResetForgotPasswordBody {
    newPassword?: string;
}

export interface ChangeCurrentPasswordBody {
    oldPassword?: string;
    newPassword?: string;
}

export interface RefreshTokenBody {
    refreshToken?: string;
}

export interface DecodedToken extends JwtPayload {
    _id: string;
}

declare global {
    namespace Express {
        interface Request {
            user?: IUserDocument;
        }
    }
}

export interface DecodedAccessToken extends JwtPayload {
    _id: string;
}

export interface AuthenticatedRequest extends Request {
    user?: IUserDocument;
}