import { Router, Route } from "@solidjs/router";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Board from "./pages/Board";
import BoardForm from "./pages/BoardForm";

export default function App() {
    return (
        <Router root={Layout}>
            <Route path="/" component={Home} />
            <Route path="/login" component={Login} />
            <Route path="/boards/:id" component={Board} />
            <Route path="/boards/create" component={BoardForm} />
        </Router>
    );
}
