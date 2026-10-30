import { createContext, useContext, useEffect, useMemo, useState } from "react";

const RouterContext = createContext(null);

const normalizePath = (path) => {
  if (!path) {
    return "/";
  }

  return path.startsWith("/") ? path : `/${path}`;
};

export const RouterProvider = ({ children }) => {
  const [path, setPath] = useState(window.location.pathname);

  useEffect(() => {
    const handlePopState = () => setPath(window.location.pathname);
    window.addEventListener("popstate", handlePopState);

    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const navigate = (to, options = {}) => {
    const nextPath = normalizePath(to);

    if (nextPath === window.location.pathname) {
      return;
    }

    if (options.replace) {
      window.history.replaceState({}, "", nextPath);
    } else {
      window.history.pushState({}, "", nextPath);
    }

    setPath(nextPath);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const value = useMemo(() => ({ path, navigate }), [path]);

  return <RouterContext.Provider value={value}>{children}</RouterContext.Provider>;
};

export const useRouter = () => {
  const context = useContext(RouterContext);

  if (!context) {
    throw new Error("useRouter must be used inside RouterProvider");
  }

  return context;
};

export const useNavigate = () => {
  return useRouter().navigate;
};

export const Link = ({ children, className = "", to, ...props }) => {
  const navigate = useNavigate();

  const handleClick = (event) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return;
    }

    event.preventDefault();
    navigate(to);
  };

  return (
    <a className={className} href={normalizePath(to)} onClick={handleClick} {...props}>
      {children}
    </a>
  );
};

export const NavLink = ({ children, className = "", to, ...props }) => {
  const { path } = useRouter();
  const targetPath = normalizePath(to);
  const isActive = path === targetPath;
  const resolvedClassName = [className, isActive ? "active" : ""].filter(Boolean).join(" ");

  return (
    <Link className={resolvedClassName} to={to} {...props}>
      {children}
    </Link>
  );
};

export const Navigate = ({ replace = false, to }) => {
  const navigate = useNavigate();

  useEffect(() => {
    navigate(to, { replace });
  }, [navigate, replace, to]);

  return null;
};

export const matchPath = (pattern, path) => {
  const patternParts = normalizePath(pattern).split("/").filter(Boolean);
  const pathParts = normalizePath(path).split("/").filter(Boolean);

  if (patternParts.length !== pathParts.length) {
    return null;
  }

  const params = {};

  for (let index = 0; index < patternParts.length; index += 1) {
    const patternPart = patternParts[index];
    const pathPart = pathParts[index];

    if (patternPart.startsWith(":")) {
      params[patternPart.slice(1)] = decodeURIComponent(pathPart);
    } else if (patternPart !== pathPart) {
      return null;
    }
  }

  return { params };
};
