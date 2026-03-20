import * as fs from "fs";
import * as babel from "@babel/core";

const filePath = "./app/create/_components/CreateVampire.tsx";
const code = fs.readFileSync(filePath, "utf-8");

const transformConstants = () => {
  return {
    visitor: {
      VariableDeclarator(path) {
        if (
          path.node.id.name === "isAnimalGhoul" ||
          path.node.id.name === "isRevenant" ||
          path.node.id.name === "ghoulState" ||
          path.node.id.name === "familyOptions"
        ) {
          if (path.node.id.name === "familyOptions") {
            path.node.init = babel.types.arrayExpression([]);
            // remove the types/casting so it doesn't break
          } else {
            path.node.init = babel.types.booleanLiteral(false);
          }
        }
      },
      ConditionalExpression(path) {
        if (path.node.test.type === "BooleanLiteral") {
          if (path.node.test.value === true) {
            path.replaceWith(path.node.consequent);
          } else {
            path.replaceWith(path.node.alternate);
          }
        } else if (path.node.test.type === "Identifier") {
          if (
            path.node.test.name === "isAnimalGhoul" ||
            path.node.test.name === "isRevenant"
          ) {
            path.replaceWith(path.node.alternate);
          }
        }
      },
      LogicalExpression(path) {
        if (path.node.operator === "&&") {
          if (
            path.node.left.type === "Identifier" &&
            (path.node.left.name === "isAnimalGhoul" ||
              path.node.left.name === "isRevenant")
          ) {
            if (path.parentPath.isJSXExpressionContainer()) {
              path.replaceWith(babel.types.nullLiteral());
            } else {
              path.replaceWith(babel.types.booleanLiteral(false));
            }
          }
          if (
            path.node.left.type === "BooleanLiteral" &&
            path.node.left.value === false
          ) {
            if (path.parentPath.isJSXExpressionContainer()) {
              path.replaceWith(babel.types.nullLiteral());
            } else {
              path.replaceWith(babel.types.booleanLiteral(false));
            }
          }
        }
      },
    },
  };
};

try {
  const output = babel.transformSync(code, {
    presets: [
      "@babel/preset-typescript",
      ["@babel/preset-react", { runtime: "automatic" }],
    ],
    plugins: [transformConstants],
    filename: filePath,
    retainLines: true,
  });

  if (output && output.code) {
    fs.writeFileSync(filePath, output.code, "utf-8");
    console.log(
      "Successfully stripped out animal ghoul and revenant dead branches via AST.",
    );
  } else {
    console.error("Babel transform failed.");
  }
} catch (e) {
  console.error(e);
}
