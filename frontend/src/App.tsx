import { Router, Route } from "@solidjs/router";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Board from "./pages/Board";
import BoardLayout from "./pages/BoardLayout";
import BoardForm from "./pages/BoardForm";
import Join from "./pages/Join";
import Settings from "./pages/Settings";
import BoardSettings from "./pages/BoardSettings";
import Users from "./pages/Users";

export default function App() {
    return (
        <Router root={Layout}>
            <Route path="/" component={Home} />
            <Route path="/login" component={Login} />
            <Route path="/join" component={Join} />
            <Route path="/boards/:id" component={BoardLayout}>
                <Route path="/" component={Board} />
                <Route path="/settings" component={BoardSettings} />
            </Route>
            <Route path="/boards/create" component={BoardForm} />
            <Route path="/settings" component={Settings} />
            <Route path="/users" component={Users} />
        </Router>
    );
}
