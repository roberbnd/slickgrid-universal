import { FieldType, SearchTerm } from '../enums/index';
import { FilterCondition, FilterConditionOption } from '../interfaces/index';
import { executeBooleanFilterCondition, getFilterParsedBoolean } from './booleanFilterCondition';
import { executeCollectionSearchFilterCondition } from './collectionSearchFilterCondition';
import { getFilterParsedNumbers, executeNumberFilterCondition } from './numberFilterCondition';
import { executeAssociatedDateCondition, getFilterParsedDates } from './dateFilterCondition';
import { executeObjectFilterCondition, getFilterParsedObjectResult } from './objectFilterCondition';
import { executeStringFilterCondition, getFilterParsedText } from './stringFilterCondition';

/** General variable type, just 5x types instead of the multiple FieldType (over 30x of them) */
export type GeneralVariableType = 'boolean' | 'date' | 'number' | 'object' | 'text';

/** Execute mapped condition (per field type) for each cell in the grid */
export const executeMappedCondition: FilterCondition = (options: FilterConditionOption, parsedSearchTerms: SearchTerm | SearchTerm[]) => {
  // when using a multi-select ('IN' operator) we will not use the field type but instead go directly with a collection search
  const operator = options.operator?.toUpperCase();
  if (operator === 'IN' || operator === 'NIN' || operator === 'NOT_IN' || operator === 'IN_CONTAINS' || operator === 'NIN_CONTAINS' || operator === 'NOT_IN_CONTAINS') {
    return executeCollectionSearchFilterCondition(options);
  }

  // From a more specific field type (dateIso, dateEuro, text, readonly, ...), get the more generalized type (boolean, date, number, object, text)
  const generalType = getGeneralTypeByFieldType(options.fieldType);

  // execute the mapped type, or default to String condition check
  switch (generalType) {
    case 'boolean':
      // the parsedSearchTerms should be single value (pulled from getFilterParsedBoolean()), but we can play safe
      const parsedSearchBoolean = Array.isArray(parsedSearchTerms) ? parsedSearchTerms[0] : parsedSearchTerms;
      return executeBooleanFilterCondition(options, parsedSearchBoolean as SearchTerm);
    case 'date':
      return executeAssociatedDateCondition(options, ...parsedSearchTerms as any[]);
    case 'number':
      return executeNumberFilterCondition(options, ...parsedSearchTerms as number[]);
    case 'object':
      // the parsedSearchTerms should be single value (pulled from getFilterParsedObjectResult()), but we can play safe
      const parsedSearchObjectValue = Array.isArray(parsedSearchTerms) ? parsedSearchTerms[0] : parsedSearchTerms;
      return executeObjectFilterCondition(options, parsedSearchObjectValue as SearchTerm);
    case 'text':
    default:
      // the parsedSearchTerms should be single value (pulled from getFilterParsedText()), but we can play safe
      const parsedSearchText = Array.isArray(parsedSearchTerms) ? parsedSearchTerms[0] : parsedSearchTerms;
      return executeStringFilterCondition(options, parsedSearchText as SearchTerm);
  }
};

/**
 * From our search filter value(s), get their parsed value(s),
 * for example a "dateIso" filter will be parsed as Moment object(s) to later execute filtering checks.
 * This is called only once per filter before running the actual filter condition check on each cell afterward.
 */
export function getParsedSearchTermsByFieldType(inputSearchTerms: SearchTerm[] | undefined, inputFilterSearchType: typeof FieldType[keyof typeof FieldType]): SearchTerm | SearchTerm[] | undefined {
  const generalType = getGeneralTypeByFieldType(inputFilterSearchType);
  let parsedSearchValues: SearchTerm | SearchTerm[] | undefined;

  switch (generalType) {
    case 'boolean':
      parsedSearchValues = getFilterParsedBoolean(inputSearchTerms) as boolean;
      break;
    case 'date':
      parsedSearchValues = getFilterParsedDates(inputSearchTerms, inputFilterSearchType) as SearchTerm[];
      break;
    case 'number':
      parsedSearchValues = getFilterParsedNumbers(inputSearchTerms) as SearchTerm[];
      break;
    case 'object':
      parsedSearchValues = getFilterParsedObjectResult(inputSearchTerms) as SearchTerm;
      break;
    case 'text':
      parsedSearchValues = getFilterParsedText(inputSearchTerms) as SearchTerm;
      break;
  }
  return parsedSearchValues;
}


/**
 * From a more specific field type, let's return a simple and more general type (boolean, date, number, object, text)
 * @param fieldType - specific field type
 * @returns generalType - general field type
 */
function getGeneralTypeByFieldType(fieldType: typeof FieldType[keyof typeof FieldType]): GeneralVariableType {
  // return general field type
  switch (fieldType) {
    case FieldType.boolean:
      return 'boolean';
    case FieldType.date:
    case FieldType.dateIso:
    case FieldType.dateUtc:
    case FieldType.dateTime:
    case FieldType.dateTimeIso:
    case FieldType.dateTimeIsoAmPm:
    case FieldType.dateTimeIsoAM_PM:
    case FieldType.dateTimeShortIso:
    case FieldType.dateEuro:
    case FieldType.dateEuroShort:
    case FieldType.dateTimeShortEuro:
    case FieldType.dateTimeEuro:
    case FieldType.dateTimeEuroAmPm:
    case FieldType.dateTimeEuroAM_PM:
    case FieldType.dateTimeEuroShort:
    case FieldType.dateTimeEuroShortAmPm:
    case FieldType.dateTimeEuroShortAM_PM:
    case FieldType.dateUs:
    case FieldType.dateUsShort:
    case FieldType.dateTimeShortUs:
    case FieldType.dateTimeUs:
    case FieldType.dateTimeUsAmPm:
    case FieldType.dateTimeUsAM_PM:
    case FieldType.dateTimeUsShort:
    case FieldType.dateTimeUsShortAmPm:
    case FieldType.dateTimeUsShortAM_PM:
      return 'date';
    case FieldType.integer:
    case FieldType.float:
    case FieldType.number:
      return 'number';
    case FieldType.object:
      return 'object';
    case FieldType.string:
    case FieldType.text:
    case FieldType.password:
    case FieldType.readonly:
    default:
      return 'text';
  }
}