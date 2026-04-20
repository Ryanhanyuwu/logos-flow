import Link from "next/link";
import { signOut } from "~/actions/auth";
import { createClient } from "~/lib/supabase/server";
import { Button } from "~/components/ui/button";

export async function Navbar() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const username = user?.user_metadata?.username as string | undefined;

  return (
    <header className="flex h-11 shrink-0 items-center justify-between border-b border-border bg-background px-5">
      <Link
        href="/"
        className="text-sm font-medium tracking-tight text-foreground"
      >
        Logos Flow
      </Link>
      <div className="flex items-center gap-3">
        {user ? (
          <>
            <span className="text-sm text-muted-foreground">{username}</span>
            <form action={signOut}>
              <Button type="submit" variant="ghost" size="sm">
                Sign out
              </Button>
            </form>
          </>
        ) : (
          <>
            <Link
              href="/auth/login"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Sign in
            </Link>
            <Link href="/auth/signup">
              <Button variant="outline" size="sm">
                Sign up
              </Button>
            </Link>
          </>
        )}
      </div>
    </header>
  );
}
