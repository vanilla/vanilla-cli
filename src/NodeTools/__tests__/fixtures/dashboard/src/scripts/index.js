import * as React from "react";
import { Garden } from "@core/garden.js";

Garden.log();

// Ensure babel transpiles this. Webpack cannot parse this without babel working properly.
const thing = {
    foo: "foo",
    bar: "bar"
};

const thing2 = {
    ...thing,
    baz: "baz",
};
