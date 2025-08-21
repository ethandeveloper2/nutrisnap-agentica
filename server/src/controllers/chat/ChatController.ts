import { Agentica } from "@agentica/core";
import {
  AgenticaRpcService,
  IAgenticaRpcListener,
  IAgenticaRpcService,
} from "@agentica/rpc";
import { WebSocketRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import { HttpLlm, OpenApi } from "@samchon/openapi";
import OpenAI from "openai";
import { WebSocketAcceptor } from "tgrid";
import typia from "typia";

import { MyConfiguration } from "../../MyConfiguration";
import { MyGlobal } from "../../MyGlobal";
import { NutritionController } from "../nutrition/NutritionController";

  import { ArxivSearchService } from "@wrtnlabs/connector-arxiv-search";
  import { GoogleCalendarService } from "@wrtnlabs/connector-google-calendar";
  import { GoogleSearchService } from "@wrtnlabs/connector-google-search";
  import { GoogleDriveService } from "@wrtnlabs/connector-google-drive";

@Controller("chat")
export class MyChatController {
  @WebSocketRoute()
  public async start(
    @WebSocketRoute.Acceptor()
    acceptor: WebSocketAcceptor<
      undefined,
      IAgenticaRpcService<"chatgpt">,
      IAgenticaRpcListener
    >,
  ): Promise<void> {
    const agent: Agentica<"chatgpt"> = new Agentica({
      model: "chatgpt",
      vendor: {
        api: new OpenAI({ apiKey: MyGlobal.env.OPENAI_API_KEY }),
        model: "gpt-4o-mini",
      },
      controllers: [
        {
          name: "Nutrition Parser",
          protocol: "class",
          application: typia.llm.application<NutritionController, "chatgpt">(),
          execute: new NutritionController(),
        },
        {
          name: "ArxivSearch Connector",
          protocol: "class",
          application: typia.llm.application<ArxivSearchService, "chatgpt">(),
          execute: new ArxivSearchService(),
        },
        {
          name: "GoogleCalendar Connector",
          protocol: "class",
          application: typia.llm.application<GoogleCalendarService, "chatgpt">(),
          execute: new GoogleCalendarService({
            googleClientId: MyGlobal.env.GOOGLE_CLIENT_ID,
            googleClientSecret: MyGlobal.env.GOOGLE_CLIENT_SECRET,
            googleRefreshToken: MyGlobal.env.GOOGLE_REFRESH_TOKEN,
          }),
        },
        {
          name: "GoogleSearch Connector",
          protocol: "class",
          application: typia.llm.application<GoogleSearchService, "chatgpt">(),
          execute: new GoogleSearchService({
            serpApiKey: MyGlobal.env.SERP_API_KEY,
          }),
        },
        {
          name: "GoogleDrive Connector",
          protocol: "class",
          application: typia.llm.application<GoogleDriveService, "chatgpt">(),
          execute: new GoogleDriveService({
            googleClientId: MyGlobal.env.GOOGLE_CLIENT_ID,
            googleClientSecret: MyGlobal.env.GOOGLE_CLIENT_SECRET,
            googleRefreshToken: MyGlobal.env.GOOGLE_REFRESH_TOKEN,
          }),
        },
      ],
    });
    const service: AgenticaRpcService<"chatgpt"> = new AgenticaRpcService({
      agent,
      listener: acceptor.getDriver(),
    });
    await acceptor.accept(service);
  }
}
