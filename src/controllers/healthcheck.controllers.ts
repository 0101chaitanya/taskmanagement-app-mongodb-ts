import {asyncHandler} from "../utils/asyncHandler.ts";
import {ApiResponse} from "../utils/apiResponse.ts";

const healthCheck = asyncHandler(async (req, res) => {
    res.status(200).json(new ApiResponse(200, {message: "Server is running"}));
});

export {healthCheck};
