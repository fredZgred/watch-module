import isPlainObject from 'lodash.isplainobject';
import v8 from 'v8';
import assert from 'assert';
import { exportedFunctionKeyName } from './constants';

const exportedFunctionKeyRegex = new RegExp(
  `^\\[\\[${exportedFunctionKeyName}]]$`,
  'i',
);

export const isEntityAFunctionRepresentation = (entity: any) =>
  typeof entity === 'string' && Boolean(entity.match(exportedFunctionKeyRegex));

export const doesModuleHaveAnyNamedExportedFunction = (moduleBody: any) =>
  isPlainObject(moduleBody) &&
  Object.values(moduleBody).some(isEntityAFunctionRepresentation);

export const doesModuleExportAnyFunction = (moduleBody: any) => {
  const functionUnderDefaultExport =
    isEntityAFunctionRepresentation(moduleBody);

  return (
    functionUnderDefaultExport ||
    doesModuleHaveAnyNamedExportedFunction(moduleBody)
  );
};

export const getNamedExportedFunctionsFromModule = (moduleBody: any) => {
  if (!doesModuleHaveAnyNamedExportedFunction(moduleBody)) {
    throw new Error('Module does not export any function');
  }
  return Object.entries(moduleBody)
    .filter(
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      ([_, entity]) => isEntityAFunctionRepresentation(entity),
    )
    .map(([name, body]) => ({ body, name }));
};

export const isDataSerializable = (data: any) => {
  try {
    const dataClone = v8.deserialize(v8.serialize(data));
    assert.deepStrictEqual(dataClone, data);
    return true;
  } catch (e) {
    return false;
  }
};

export const executeModuleFunction = async (
  func: Function,
  fallbackErrorMessage: string,
) => {
  let executionResult;
  try {
    executionResult = await func();
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : fallbackErrorMessage;
    return { data: errorMessage, error: true, serializable: false };
  }

  const serializable = isDataSerializable(executionResult);
  return {
    data: serializable ? executionResult : undefined,
    error: false,
    serializable,
  };
};

interface ExecutionResult {
  data: any;
  error: boolean;
  serializable: boolean;
}

export const parseModuleFunctionExecutionResult = (
  result: ExecutionResult,
  serializationError: string,
) => {
  const data = result.error ? undefined : result.data;
  let error = result.error ? new Error(result.data) : undefined;
  if (!data && !error && !result.serializable) {
    error = new Error(serializationError);
  }
  return { data, error };
};
