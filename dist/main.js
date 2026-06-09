"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const helmet_1 = __importDefault(require("helmet"));
const app_module_1 = require("./app.module");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule, {
        logger: ['error', 'warn', 'log'],
    });
    const config = app.get(config_1.ConfigService);
    const port = config.get('PORT', 3001);
    const frontendUrl = config.get('FRONTEND_URL', 'http://localhost:3000');
    app.setGlobalPrefix('api/v1');
    app.use((0, helmet_1.default)());
    app.enableCors({
        origin: [frontendUrl],
        credentials: true,
    });
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
    }));
    await app.listen(port);
    common_1.Logger.log(`🚀 FieldCompliance API running on http://localhost:${port}/api/v1`, 'Bootstrap');
}
bootstrap();
//# sourceMappingURL=main.js.map