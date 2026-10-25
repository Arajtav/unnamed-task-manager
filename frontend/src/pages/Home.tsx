import { Title } from "@solidjs/meta";
import TimeGraph from "../components/TimeGraph";

export default function Home() {
    return (
        <div class="w-full h-full flex items-center justify-center">
            <Title>Task Manager</Title>
            <TimeGraph />
        </div>
    );
}
