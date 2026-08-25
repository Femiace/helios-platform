# Tooling Primer

Working notes on PowerShell and Git for the HELIOS build.

## PowerShell

A terminal is a way of instructing the computer by typing instead of clicking.
Some tools, including pac and git, have no clicking option at all.

A terminal is always standing in one folder. Commands act relative to that
folder. The prompt shows where you are standing. Check it before running
anything that touches files.

| Command | Alias | Does |
| --- | --- | --- |
| Get-Location | pwd | Shows the folder you are standing in |
| Set-Location | cd | Moves to another folder |
| Get-ChildItem | ls, dir | Lists what is in the current folder |
| Get-Content | cat | Prints the contents of a file |
| New-Item | | Creates a file or folder |

Reading a command: first word is the program, following words are the area
and the action, words starting with two hyphens are named settings, and the
word after each setting is its value.

A single dot means the current folder. Two dots means the folder above.

Silence usually means success. Red is an error, yellow is a warning.
$LASTEXITCODE returns 0 on success and anything else on failure.

Up arrow recalls the previous command. Tab completes file and folder names.

Backtick line continuations are unreliable when pasted into the terminal.
Use single-line commands however long they get.

## Git

Git records snapshots of a folder over time. Each snapshot is a commit,
carrying an author, a timestamp and a message.

The entire history lives in the hidden .git folder inside the repository.
Git works offline because the history is local.

A change moves through three places:

  Working directory -> Staging area -> Repository
  (files on disk)      (the shortlist)  (permanent history)

Staging exists so that unrelated changes can be committed separately
instead of lumped into one meaningless snapshot.

| Command | Does |
| --- | --- |
| git status | Shows the state of all three places. Run it constantly. |
| git log --oneline | Lists commits, newest first |
| git diff | Shows unstaged changes line by line |
| git add | Moves a change into the staging area |
| git commit -m "message" | Records the staged changes as a snapshot |
| git push | Sends local commits to the remote |
| git pull | Brings remote commits down |

A branch is a named line of work. The default branch is main.

A remote is a copy of the repository elsewhere. Ours is on GitHub and is
nicknamed origin. A commit is not a backup until it has been pushed.

.gitignore lists files Git should not track: build outputs, secrets, and
local noise. Anything committed once stays in the history permanently, so
secrets must be excluded before they exist, not after.

## Why HELIOS unpacks solutions

A solution export is a zip. Zips are binary, so Git can see that one changed
but not what changed inside it. Unpacking turns the solution into hundreds of
small text files, which Git can diff line by line.

That is what makes the repository a usable record of what the platform was
configured to do at any point in time, and what allows a build server to
deploy from source without a human clicking export.