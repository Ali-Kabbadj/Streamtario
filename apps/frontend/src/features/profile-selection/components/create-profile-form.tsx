"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useCreateProfile } from "@/features/profile/hooks/use-create-profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { AvatarPicker } from "./avatar-picker"; // <-- IMPORT

// The validation schema remains the same.
const profileFormSchema = z
  .object({
    name: z
      .string()
      .min(2, { message: "Name must be at least 2 characters." })
      .max(50),
    avatar: z.string().optional(), // We now have a way to set this value
    isPrivate: z.boolean().default(false),
    pin: z.string().optional(),
  })
  .refine(
    (data) => {
      return !data.isPrivate || (data.pin && /^\d{4}$/.test(data.pin));
    },
    {
      message: "A 4-digit PIN is required for private profiles.",
      path: ["pin"],
    },
  );

type ProfileFormValues = z.infer<typeof profileFormSchema>;

interface CreateProfileFormProps {
  onSuccess: () => void;
}

export const CreateProfileForm = ({ onSuccess }: CreateProfileFormProps) => {
  const { mutate, isPending, isSuccess, error } = useCreateProfile();

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      name: "",
      avatar: "/avatars/avatar1.png", // Set a default avatar
      isPrivate: false,
      pin: "",
    },
  });

  const isPrivate = form.watch("isPrivate");

  const onSubmit = (data: ProfileFormValues) => {
    mutate(data);
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
        {/* --- ADD THE AVATAR PICKER FIELD --- */}
        <FormField
          control={form.control}
          name="avatar"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Choose an Avatar</FormLabel>
              <FormControl>
                <AvatarPicker value={field.value} onChange={field.onChange} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

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
