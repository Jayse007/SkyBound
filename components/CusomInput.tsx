import {
  FormControl,
  FormField,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { formSchema } from "@/lib/utils";
import {Control, FieldPath } from 'react-hook-form'
import z from "zod";


const formSch = formSchema('sign-up');

interface CustomInputProps {
  control: Control<z.infer<typeof formSch>>,
  name: FieldPath<z.infer<typeof formSch>>,
  label: string,
  placeholder: string

}

const CustomInput = ({control, name, label, placeholder}: CustomInputProps) => {
    return(
        <FormField
            control={control}
            name={name}
            render={({ field }) => (
              <div className="form-item">
                <FormLabel className="form-label">
                  {label}
                </FormLabel>
                <div className="flex w-full flex-col">
                  <FormControl>
                    <Input
                       placeholder={placeholder}
                       className="input-class"
                       type = {name === 'password' ? 'password' : 'text'}
                       {...field} 
                    />
                  </FormControl>
                  <FormMessage className="form-message mt-3" />
                  </div>
        
                  </div>
            )}
        />
    )
}

export default CustomInput;