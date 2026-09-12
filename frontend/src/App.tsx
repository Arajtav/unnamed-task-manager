import { Router, Route } from "@solidjs/router";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Boards from "./pages/Boards";
import Board from "./pages/Board";

export default function App() {
    return (
        <Router root={Layout}>
            <Route path="/" component={Home} />
            <Route path="/login" component={Login} />
            <Route path="/boards" component={Boards} />
            <Route path="/boards/:id" component={Board} />
        </Router>
    );
}
