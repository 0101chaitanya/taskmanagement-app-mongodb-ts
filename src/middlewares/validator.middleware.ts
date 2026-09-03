import type {NextFunction, Request, Response} from "express";
import {
    type FieldValidationError,
    type ValidationError,
    validationResult
} from "express-validator";
import {ApiError} from "../utils/apiError.ts";

export interface ValidationErrorItem {
    [key: string]: string;
}

export const validate = (
    req: Request,
    res: Response,
    next: NextFunction,
): void => {
    const errors = validationResult(req);
    if (errors.isEmpty()) {
        return next();
    }

    const extractedErrors: ValidationErrorItem[] = errors
        .array()
        .map((err: ValidationError) => {
            const fieldKey = (err as FieldValidationError).path ??
                (err as any).param ?? "error";
            return {
                [fieldKey]: err.msg,
            };
        });

    throw new ApiError(422, "Received data is not valid",
        extractedErrors);
};