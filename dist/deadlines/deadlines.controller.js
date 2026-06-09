"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeadlinesController = void 0;
const common_1 = require("@nestjs/common");
const deadlines_service_1 = require("./deadlines.service");
const current_user_decorator_1 = require("../auth/decorators/current-user.decorator");
const complete_deadline_dto_1 = require("./dto/complete-deadline.dto");
let DeadlinesController = class DeadlinesController {
    deadlines;
    constructor(deadlines) {
        this.deadlines = deadlines;
    }
    list(user, status, facilityId) {
        return this.deadlines.list(user.orgId, { status, facilityId });
    }
    upcoming(user, days = '30') {
        return this.deadlines.upcoming(user.orgId, parseInt(days, 10));
    }
    overdue(user) {
        return this.deadlines.overdue(user.orgId);
    }
    findOne(user, id) {
        return this.deadlines.findById(id, user.orgId);
    }
    complete(user, id, dto) {
        return this.deadlines.complete(id, user.orgId, user.id, dto.notes);
    }
    assign(user, id, body) {
        return this.deadlines.assign(id, user.orgId, body.userId);
    }
};
exports.DeadlinesController = DeadlinesController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('status')),
    __param(2, (0, common_1.Query)('facilityId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", void 0)
], DeadlinesController.prototype, "list", null);
__decorate([
    (0, common_1.Get)('upcoming'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('days')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], DeadlinesController.prototype, "upcoming", null);
__decorate([
    (0, common_1.Get)('overdue'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], DeadlinesController.prototype, "overdue", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], DeadlinesController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id/complete'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, complete_deadline_dto_1.CompleteDeadlineDto]),
    __metadata("design:returntype", void 0)
], DeadlinesController.prototype, "complete", null);
__decorate([
    (0, common_1.Patch)(':id/assign'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], DeadlinesController.prototype, "assign", null);
exports.DeadlinesController = DeadlinesController = __decorate([
    (0, common_1.Controller)('deadlines'),
    __metadata("design:paramtypes", [deadlines_service_1.DeadlinesService])
], DeadlinesController);
//# sourceMappingURL=deadlines.controller.js.map