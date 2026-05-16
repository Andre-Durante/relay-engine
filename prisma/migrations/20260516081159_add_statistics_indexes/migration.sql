-- CreateIndex
CREATE INDEX "delivery_events_package_id_timestamp_idx" ON "delivery_events"("package_id", "timestamp");

-- CreateIndex
CREATE INDEX "delivery_events_driver_id_timestamp_idx" ON "delivery_events"("driver_id", "timestamp");
