/**
 * Type declaration for web-ifc Node build (web-ifc-api-node.js).
 * The package subpath is not in its exports, so we declare it for TypeScript.
 */
declare module "web-ifc/web-ifc-api-node.js" {
  export class IfcAPI {
    Init(locateFile?: (path: string, prefix: string) => string): Promise<void>;
    OpenModel(data: Uint8Array): number;
    CloseModel(modelID: number): void;
    GetModelSchema(modelID: number): string;
    GetTypeCodeFromName(name: string): number;
    GetLineIDsWithType(
      modelID: number,
      type: number,
      includeInherited?: boolean
    ): { size(): number; get(i: number): number };
    GetLine(modelID: number, expressID: number, flatten?: boolean): unknown;
    properties: {
      getItemProperties(
        modelID: number,
        id: number,
        recursive?: boolean
      ): Promise<unknown>;
      getPropertySets(
        modelID: number,
        elementID?: number,
        recursive?: boolean
      ): Promise<unknown[]>;
    };
  }
}
