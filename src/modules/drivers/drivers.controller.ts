import type { FastifyReply, FastifyRequest } from "fastify";
import type { MultipartFile } from "@fastify/multipart";
import { badRequest } from "../../common/errors.js";
import { DriversService } from "./drivers.service.js";

type UploadDriversBody = {
  file?: MultipartFile;
};

export class DriversController {
  constructor(private readonly driversService = new DriversService()) {}

  uploadDrivers = async (request: FastifyRequest, reply: FastifyReply) => {
    // The route expects multipart/form-data with a field named `file`. Fastify's
    // multipart plugin attaches the parsed file to the request body so Swagger
    // can validate and document it as a real file upload.
    const uploadedFile = (request.body as UploadDriversBody | undefined)?.file;

    if (!uploadedFile) {
      throw badRequest("Multipart file field 'file' is required");
    }

    // Keep HTTP-specific work in the controller, then hand the file contents to
    // the service where validation and import rules live.
    const csvBuffer = await uploadedFile.toBuffer();
    const result = await this.driversService.importFromCsv(csvBuffer);

    return reply.status(201).send(result);
  };
}
