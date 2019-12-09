import InfoController from "./controller/InfoController";
import HealthController from "./controller/HealthController";
import ReportsController from "./controller/ReportsController";
import LogController from "./controller/LogController";

export const Routes = [
    {
        method: "get",
        route: "/info",
        controller: InfoController,
        action: "version"
    },
    {
        method: "get",
        route: "/health",
        controller: HealthController,
        action: "version"
    },
    {
        method: "get",
        route: "/health/clear/:eventId",
        controller: HealthController,
        action: "clear"
    },
    {
        method: "get",
        route: "/zos",
        controller: ReportsController,
        action: "reports"
    },
    {
        method: "get",
        route: "/logs-secret",
        controller: LogController,
        action: "logs"
    },
];