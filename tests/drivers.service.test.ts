import { describe, expect, it, vi } from "vitest";
import { AppError } from "../src/common/errors.js";
import { DriversService } from "../src/modules/drivers/drivers.service.js";

describe("DriversService", () => {
  function createService() {
    const repository = {
      upsertMany: vi.fn(async (drivers: unknown[]) => drivers.length)
    };

    return {
      repository,
      service: new DriversService(repository as never)
    };
  }

  it("imports tab-separated driver files with mixed-case regions", async () => {
    const { repository, service } = createService();
    const result = await service.importFromCsv(
      Buffer.from(
        [
          "driver_id\tname\tphone_number\temail\tregion",
          "1\tDwayne Jhonson\t+35312341234\tjhonson@gmail.com\tNorth",
          "2\tThe Rock\t+353213213213\trock@gmail.com\tSouth"
        ].join("\n")
      )
    );

    expect(result.imported).toBe(2);
    expect(repository.upsertMany).toHaveBeenCalledWith(
      expect.arrayContaining([
        {
          driverId: "1",
          name: "Dwayne Jhonson",
          phoneNumber: "+35312341234",
          email: "jhonson@gmail.com",
          region: "north"
        }
      ])
    );
  });

  it("imports comma-separated driver files", async () => {
    const { repository, service } = createService();
    const result = await service.importFromCsv(
      Buffer.from(
        [
          "driver_id,name,phone_number,email,region",
          "7,Ava Johnson,+15551234567,ava@example.com,north"
        ].join("\n")
      )
    );

    expect(result.imported).toBe(1);
    expect(repository.upsertMany).toHaveBeenCalledWith([
      {
        driverId: "7",
        name: "Ava Johnson",
        phoneNumber: "+15551234567",
        email: "ava@example.com",
        region: "north"
      }
    ]);
  });

  it("supports common header aliases", async () => {
    const { repository, service } = createService();

    await service.importFromCsv(
      Buffer.from(
        [
          "Driver ID,Driver Name,Phone,Email Address,Region",
          "9,Alias Driver,+15550000000,alias@example.com,west"
        ].join("\n")
      )
    );

    expect(repository.upsertMany).toHaveBeenCalledWith([
      {
        driverId: "9",
        name: "Alias Driver",
        phoneNumber: "+15550000000",
        email: "alias@example.com",
        region: "west"
      }
    ]);
  });

  it("rejects duplicate driver IDs in the same file", async () => {
    const { repository, service } = createService();

    await expect(
      service.importFromCsv(
        Buffer.from(
          [
            "driver_id,name,phone_number,email,region",
            "1,Dwayne Jhonson,+35312341234,jhonson@gmail.com,north",
            "1,The Rock,+353213213213,rock@gmail.com,south"
          ].join("\n")
        )
      )
    ).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
      statusCode: 400
    } satisfies Partial<AppError>);

    expect(repository.upsertMany).not.toHaveBeenCalled();
  });

  it("rejects rows with invalid email or region", async () => {
    const { repository, service } = createService();

    await expect(
      service.importFromCsv(
        Buffer.from(
          [
            "driver_id,name,phone_number,email,region",
            "1,Dwayne Jhonson,+35312341234,not-an-email,north",
            "2,The Rock,+353213213213,rock@gmail.com,central"
          ].join("\n")
        )
      )
    ).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
      statusCode: 400
    } satisfies Partial<AppError>);

    expect(repository.upsertMany).not.toHaveBeenCalled();
  });

  it("rejects files with no driver rows", async () => {
    const { repository, service } = createService();

    await expect(service.importFromCsv(Buffer.from("driver_id,name,phone_number,email,region\n"))).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
      statusCode: 400
    } satisfies Partial<AppError>);

    expect(repository.upsertMany).not.toHaveBeenCalled();
  });
});
