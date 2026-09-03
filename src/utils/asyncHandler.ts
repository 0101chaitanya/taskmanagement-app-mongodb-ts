import type {NextFunction, Request, RequestHandler, Response} from "express";

type AsyncRequestHandler = (
    req: Request,
    res: Response,
    next: NextFunction,
) => Promise<unknown> | unknown;
//| unknown;

const asyncHandler = (requestHandler: AsyncRequestHandler): RequestHandler => {
    return (req: Request, res: Response, next: NextFunction) => {
        Promise.resolve(requestHandler(req, res, next)).catch((err: unknown) => {
            next(err);
        });
    };
};

export {asyncHandler};