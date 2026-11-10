import React, { useEffect, useState } from "react";
import { Mountain } from "lucide-react";
import { type Problem } from "./domain";
import * as storage from "./storage";
const asset = (path: string) => `${import.meta.env.BASE_URL}${path}`;
export function usePhoto(p: Problem) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    let active = true;
    let object = "";
    setUrl("");
    if (p.photoId)
      storage
        .getPhoto(p.photoId)
        .then((blob) => {
          if (blob && active) {
            object = URL.createObjectURL(blob);
            setUrl(object);
          }
        })
        .catch(() => {});
    else if (p.samplePhoto) setUrl(asset(p.samplePhoto));
    return () => {
      active = false;
      if (object) URL.revokeObjectURL(object);
    };
  }, [p.photoId, p.samplePhoto]);
  return url;
}
export function Photo({
  problem,
  ...props
}: { problem: Problem } & React.ImgHTMLAttributes<HTMLImageElement>) {
  const url = usePhoto(problem);
  return url ? (
    <img
      {...props}
      src={url}
      alt={props.alt ?? `${problem.name} climbing wall`}
    />
  ) : (
    <div className="photo-empty">
      <Mountain size={36} />
      <span>Add a route photo</span>
    </div>
  );
}
