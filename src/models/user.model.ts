import mongoose, {type Document, type Model, Schema} from "mongoose";
import bcrypt from "bcrypt";
import {type StringValue} from "ms";
import jwt, {type Secret, type SignOptions} from "jsonwebtoken";
import {createHash, randomBytes} from "crypto";

export interface IUserAvatar {
    url: string;
    localPath: string;
}

export interface ITemporaryToken {
    unHashedToken: string;
    hashedToken: string;
    tokenExpiry: number;
}

export interface IUser {
    avatar: IUserAvatar;
    username: string;
    email: string;
    fullName?: string;
    password?: string;
    isEmailVerified: boolean;
    refreshToken?: string;
    forgotPasswordToken?: string;
    forgotPasswordExpiry?: Date;
    emailVerificationToken?: string;
    emailVerificationExpiry?: Date;
    createdAt?: Date;
    updatedAt?: Date;
}


export interface IUserMethods {
    isPasswordCorrect(password: string): Promise<boolean>;

    generateAccessToken(): string;

    generateRefreshToken(): string;

    generateTemporaryToken(): ITemporaryToken;
}

export interface IUserDocument extends IUser, IUserMethods,
    Document {
}

export type UserModel = Model<IUser, {}, IUserMethods>;

const userSchema = new Schema<IUser, UserModel, IUserMethods>(
    {
        avatar: {
            type: {
                url: String,
                localPath: String,
            },
            default: {
                url: `https://placehold.co/200x200`,
                localPath: "",
            },
        },
        username: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
            index: true,
        },
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },
        fullName: {
            type: String,
            trim: true,
        },
        password: {
            type: String,
            required: [true, "Password is required"],
        },
        isEmailVerified: {
            type: Boolean,
            default: false,
        },
        refreshToken: {
            type: String,
        },
        forgotPasswordToken: {
            type: String,
        },
        forgotPasswordExpiry: {
            type: Date,
        },
        emailVerificationToken: {
            type: String,
        },
        emailVerificationExpiry: {
            type: Date,
        },
    },
    {
        timestamps: true,
    },
)

userSchema.pre("save", async function () {
    if (!this.isModified("password") || !this.password)
        return;

    this.password = await bcrypt.hash(this.password, 10);
})
userSchema.methods.isPasswordCorrect = async function (
    password: string,
): Promise<boolean> {
    if (!this.password) return false;
    return await bcrypt.compare(password, this.password);
};

// Instance method: Generate access token
userSchema.methods.generateAccessToken = function ():
    string {
    const secret: Secret = process.env.ACCESS_TOKEN_SECRET! as Secret;
    const options: SignOptions = {
        expiresIn: (process.env.ACCESS_TOKEN_EXPIRY! || "1d") as StringValue
    }

    return jwt.sign(
        {
            _id: this._id,
            email: this.email,
            username: this.username,
        },
        secret,
        options,
    );
};

// Instance method: Generate refresh token
userSchema.methods.generateRefreshToken = function ():
    string {
    const secret: Secret = process.env.REFRESH_TOKEN_SECRET! as Secret;
    const options: SignOptions = {
        expiresIn: (process.env.REFRESH_TOKEN_EXPIRY! || "10d") as StringValue,
    }

    return jwt.sign(
        {
            _id: this._id,
        },
        secret,
        options,
    );
};

userSchema.methods.generateTemporaryToken = function ():
    ITemporaryToken {
    const unHashedToken = randomBytes(20).toString("hex");

    const hashedToken = createHash("sha256")
        .update(unHashedToken)
        .digest("hex");

    const tokenExpiry = Date.now() + 20 * 60 * 1000;
    return {unHashedToken, hashedToken, tokenExpiry};
};

export const User = mongoose.model<IUser,
    UserModel>("User", userSchema);