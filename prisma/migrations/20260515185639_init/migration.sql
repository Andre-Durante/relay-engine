-- CreateEnum
CREATE TYPE "Region" AS ENUM ('north', 'south', 'east', 'west');

-- CreateEnum
CREATE TYPE "DeliveryStatus" AS ENUM ('picked_up', 'in_transit', 'delivered', 'failed', 'returned');

-- CreateTable
CREATE TABLE "drivers" (
    "driver_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone_number" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "region" "Region" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "drivers_pkey" PRIMARY KEY ("driver_id")
);

-- CreateTable
CREATE TABLE "delivery_events" (
    "id" TEXT NOT NULL,
    "package_id" TEXT NOT NULL,
    "driver_id" TEXT NOT NULL,
    "status" "DeliveryStatus" NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "delivery_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "drivers_region_idx" ON "drivers"("region");

-- CreateIndex
CREATE INDEX "delivery_events_driver_id_idx" ON "delivery_events"("driver_id");

-- CreateIndex
CREATE INDEX "delivery_events_package_id_idx" ON "delivery_events"("package_id");

-- CreateIndex
CREATE INDEX "delivery_events_status_idx" ON "delivery_events"("status");

-- CreateIndex
CREATE INDEX "delivery_events_timestamp_idx" ON "delivery_events"("timestamp");

-- AddForeignKey
ALTER TABLE "delivery_events" ADD CONSTRAINT "delivery_events_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "drivers"("driver_id") ON DELETE RESTRICT ON UPDATE CASCADE;
