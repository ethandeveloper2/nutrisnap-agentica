import { Module } from "@nestjs/common";

import { ConfigController } from "./ConfigController";

@Module({
  controllers: [ConfigController],
})
export class ConfigModule {}