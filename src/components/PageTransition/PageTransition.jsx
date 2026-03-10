import { useLayoutEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import styles from "./PageTransition.module.css";

const EXIT_MS = 220;
const ENTER_MS = 350;

const PageTransition = ({ children }) => {
  const location = useLocation();
  const [rendered, setRendered] = useState(children);
  const [phase, setPhase] = useState("visible");
  const prevKey = useRef(location.key);
  const timer = useRef(null);
  const latestChildren = useRef(children);

  latestChildren.current = children;

  useLayoutEffect(() => {
    if (location.key === prevKey.current) return;

    if (timer.current) clearTimeout(timer.current);

    setPhase("exit");

    timer.current = setTimeout(() => {
      prevKey.current = location.key;
      setRendered(latestChildren.current);
      setPhase("enter");

      timer.current = setTimeout(() => {
        setPhase("visible");
      }, ENTER_MS);
    }, EXIT_MS);

    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [location.key]);

  const cls =
    phase === "exit"
      ? styles.exit
      : phase === "enter"
        ? styles.enter
        : styles.visible;

  return <div className={`${styles.wrapper} ${cls}`}>{rendered}</div>;
};

export default PageTransition;
