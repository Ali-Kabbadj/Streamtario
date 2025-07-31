"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useEffect } from "react";
import { AvatarPicker } from "./avatar-picker";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useCreateProfile } from "../hooks/use-create-profile";
import { AvatarUploader } from "@/components/features/profile/AvatarUploader";

const profileFormSchema = z
  .object({
    name: z
      .string()
      .min(2, { message: "Name must be at least 2 characters." })
      .max(50),
    avatar: z.string().optional(),
    isPrivate: z.boolean(), // No .default() here
    pin: z.string().optional(),
    avatarSource: z.enum(["default", "upload"]), // No .default() here
  })
  .refine((data) => !data.isPrivate || (data.pin && /^\d{4}$/.test(data.pin)), {
    message: "A 4-digit PIN is required for private profiles.",
    path: ["pin"],
  });

// This type is now correctly and simply inferred from the schema above.
type ProfileFormValues = z.infer<typeof profileFormSchema>;

interface CreateProfileFormProps {
  onSuccess: () => void;
}

export const CreateProfileForm = ({ onSuccess }: CreateProfileFormProps) => {
  const { mutate, isPending, isSuccess, error } = useCreateProfile();

  // We explicitly type `useForm` with our clean `ProfileFormValues` type.
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    // All defaults are now handled in one place, which is cleaner.
    defaultValues: {
      name: "",
      avatar:
        "https://i.pinimg.com/736x/a4/c6/5f/a4c65f709d4c0cb1b4329c12beb9cd78.jpg",
      isPrivate: false,
      pin: "",
      avatarSource: "default",
    },
  });

  const isPrivate = form.watch("isPrivate");
  const avatarSource = form.watch("avatarSource");

  const onSubmit = (data: ProfileFormValues) => {
    // We still strip the UI-only field before submission.
    const { ...submissionData } = data;
    mutate(submissionData);
  };

  useEffect(() => {
    if (isSuccess) {
      onSuccess();
    }
  }, [isSuccess, onSuccess]);

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-8 p-4 pt-6"
      >
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Profile Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Kids" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="avatarSource"
          render={({ field }) => (
            <FormItem className="space-y-3">
              <FormLabel>Profile Avatar</FormLabel>
              <FormControl>
                <RadioGroup
                  onValueChange={(value) => {
                    field.onChange(value);
                    form.setValue("avatar", "");
                  }}
                  value={field.value}
                  className="flex space-x-4"
                >
                  <FormItem className="flex items-center space-x-2">
                    <FormControl>
                      <RadioGroupItem value="default" id="r1" />
                    </FormControl>
                    <FormLabel htmlFor="r1" className="cursor-pointer">
                      Choose Default
                    </FormLabel>
                  </FormItem>
                  <FormItem className="flex items-center space-x-2">
                    <FormControl>
                      <RadioGroupItem value="upload" id="r2" />
                    </FormControl>
                    <FormLabel htmlFor="r2" className="cursor-pointer">
                      Upload Custom
                    </FormLabel>
                  </FormItem>
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="avatar"
          render={({ field }) => (
            <FormItem>
              <div className="pt-2">
                {avatarSource === "default" ? (
                  <AvatarPicker value={field.value} onChange={field.onChange} />
                ) : (
                  <AvatarUploader
                    value={field.value}
                    onChange={field.onChange}
                  />
                )}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="isPrivate"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border border-slate-700 p-4">
              <div className="space-y-0.5">
                <FormLabel>Private Profile</FormLabel>
                <FormDescription>
                  Protect this profile with a 4-digit PIN.
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />

        {isPrivate && (
          <FormField
            control={form.control}
            name="pin"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Profile PIN</FormLabel>
                <FormControl>
                  <Input
                    type="password"
                    placeholder="1234"
                    maxLength={4}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <Button type="submit" disabled={isPending} className="w-full">
          {isPending ? "Creating..." : "Create Profile"}
        </Button>
        {error && (
          <p className="text-center text-sm text-red-500">{error.message}</p>
        )}
      </form>
    </Form>
  );
};
