"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { useInstallAddon } from "../hooks/useInstallAddon";
import { useProfileContext } from "@/providers/profile-provider";
import { useEffect } from "react";

const installUrlSchema = z.object({
  manifestUrl: z.string().url({ message: "Please enter a valid URL." }),
});

type InstallUrlFormValues = z.infer<typeof installUrlSchema>;

interface InstallFromUrlProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

export function InstallFromUrl({ isOpen, onOpenChange }: InstallFromUrlProps) {
  const { selectedProfile } = useProfileContext();
  const profileId = selectedProfile?.id ?? "";

  const { mutate, isPending, isSuccess, error } = useInstallAddon(profileId);

  const form = useForm<InstallUrlFormValues>({
    resolver: zodResolver(installUrlSchema),
    defaultValues: {
      manifestUrl: "",
    },
  });

  const onSubmit = (data: InstallUrlFormValues) => {
    mutate({ profileId, manifestUrl: data.manifestUrl });
  };

  useEffect(() => {
    if (isSuccess) {
      onOpenChange(false);
      form.reset();
    }
  }, [isSuccess, onOpenChange, form]);

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="bg-card w-full border-slate-700 p-2 text-white sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="text-2xl">Install Addon from URL</SheetTitle>
          <SheetDescription>
            Enter the full URL to the addon&apos;s manifest.json file.
          </SheetDescription>
        </SheetHeader>
        <div className="p-5">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="manifestUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input
                        placeholder="https://.../manifest.json"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={isPending} className="w-full">
                {isPending ? "Installing..." : "Install Addon"}
              </Button>
              {error && (
                <p className="text-center text-sm text-red-500">
                  {error.message}
                </p>
              )}
            </form>
          </Form>
        </div>
      </SheetContent>
    </Sheet>
  );
}
