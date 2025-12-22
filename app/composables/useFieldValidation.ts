/**
 * Composable for field validation
 * Uses shared validators from #shared/utils/validators
 */

import { validateFieldValue, type ValidationResult } from '#shared/utils/validators'

export function useFieldValidation() {
  /**
   * Validate a field value
   */
  function validate(
    value: any,
    fieldType: string,
    config?: any,
    required?: boolean
  ): ValidationResult {
    return validateFieldValue(value, fieldType, config, required)
  }

  /**
   * Reactive validation for form fields
   */
  function useFieldValidator(
    value: Ref<any>,
    fieldType: string,
    config?: any,
    required?: boolean
  ) {
    const errorMessage = ref('')
    const isValid = ref(true)

    function validateField() {
      const result = validate(value.value, fieldType, config, required)
      isValid.value = result.valid
      errorMessage.value = result.error || ''
      return result
    }

    // Auto-validate on value change
    watch(value, () => {
      if (errorMessage.value) {
        // Re-validate if there's an existing error
        validateField()
      }
    })

    return {
      errorMessage,
      isValid,
      validate: validateField
    }
  }

  return {
    validate,
    useFieldValidator
  }
}

/**
 * Example usage:
 * 
 * // In a component
 * const { useFieldValidator } = useFieldValidation()
 * const email = ref('')
 * const { errorMessage, isValid, validate } = useFieldValidator(
 *   email,
 *   'email',
 *   { allowMultiple: false },
 *   true // required
 * )
 * 
 * // Validate on blur
 * function handleBlur() {
 *   validate()
 * }
 */

