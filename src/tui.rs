use std::{io::{self, Stdout}, path::PathBuf, time::Duration};
use anyhow::Result;
use crossterm::{event::{self, Event, KeyCode}, execute, terminal::{disable_raw_mode, enable_raw_mode, EnterAlternateScreen, LeaveAlternateScreen}};
use ratatui::{backend::CrosstermBackend, layout::{Constraint, Direction, Layout}, style::{Color, Modifier, Style}, text::{Line, Span}, widgets::{Block, Borders, List, ListItem, Paragraph, Wrap}, Terminal};

use crate::{init_engine, models::TaskStatus};

pub async fn run(repo: PathBuf) -> Result<()> {
    let engine = init_engine(repo)?;
    enable_raw_mode()?;
    let mut stdout = io::stdout();
    execute!(stdout, EnterAlternateScreen)?;
    let backend = CrosstermBackend::new(stdout);
    let mut terminal = Terminal::new(backend)?;
    let result = loop_tui(&mut terminal, engine).await;
    disable_raw_mode()?;
    execute!(terminal.backend_mut(), LeaveAlternateScreen)?;
    terminal.show_cursor()?;
    result
}

async fn loop_tui(terminal: &mut Terminal<CrosstermBackend<Stdout>>, engine: std::sync::Arc<crate::engine::Engine>) -> Result<()> {
    let mut selected = 0usize;
    loop {
        let snapshot = engine.dashboard()?;
        if snapshot.tasks.is_empty() { selected = 0; } else { selected = selected.min(snapshot.tasks.len() - 1); }

        terminal.draw(|frame| {
            let chunks = Layout::default().direction(Direction::Vertical)
                .constraints([Constraint::Length(3), Constraint::Min(5), Constraint::Length(2)]).split(frame.area());

            let title = Line::from(vec![
                Span::styled(" GC // ", Style::default().fg(Color::Cyan).add_modifier(Modifier::BOLD)),
                Span::styled("GITCRAFT", Style::default().fg(Color::Magenta).add_modifier(Modifier::BOLD)),
                Span::raw("  AGENT FABRIC  |  ACP  |  SANDBOX  |  AST"),
            ]);
            frame.render_widget(Paragraph::new(title).block(Block::default().borders(Borders::ALL).title("GITCRAFT")), chunks[0]);

            let body = Layout::default().direction(Direction::Horizontal)
                .constraints([Constraint::Percentage(54), Constraint::Percentage(46)]).split(chunks[1]);

            let items = snapshot.tasks.iter().map(|task| {
                let status = match task.status {
                    TaskStatus::Queued => "Q",
                    TaskStatus::Running => "R",
                    TaskStatus::Complete => "✓",
                    TaskStatus::Failed => "!",
                    TaskStatus::Cancelled => "X",
                    TaskStatus::Blocked => "B",
                };
                ListItem::new(Line::from(vec![
                    Span::styled(format!("[{status}] "), Style::default().fg(Color::Cyan)),
                    Span::styled(&task.name, Style::default().fg(Color::White)),
                    Span::raw("  "),
                    Span::styled(&task.agent, Style::default().fg(Color::DarkGray)),
                ]))
            }).collect::<Vec<_>>();
            let list = List::new(items)
                .block(Block::default().borders(Borders::ALL).title("TASK FABRIC"))
                .highlight_style(Style::default().fg(Color::Black).bg(Color::Cyan));
            let mut state = ratatui::widgets::ListState::default();
            if !snapshot.tasks.is_empty() { state.select(Some(selected)); }
            frame.render_stateful_widget(list, body[0], &mut state);

            let detail = snapshot.tasks.get(selected).map(|task| {
                let mut lines = vec![
                    Line::from(Span::styled(&task.id, Style::default().fg(Color::Cyan))),
                    Line::from(format!("status   {:?}", task.status)),
                    Line::from(format!("agent    {}", task.agent)),
                    Line::from(format!("branch   {}", task.branch_name)),
                    Line::from(format!("repo     {}", task.repo_root)),
                ];
                if let Some(msg) = &task.error_message { lines.push(Line::from(Span::styled(msg, Style::default().fg(Color::Red)))); }
                if let Some(msg) = &task.result_message { lines.push(Line::from(Span::styled(msg, Style::default().fg(Color::Green)))); }
                Paragraph::new(lines).wrap(Wrap { trim: true }).block(Block::default().borders(Borders::ALL).title("SELECTED"))
            }).unwrap_or_else(|| Paragraph::new("No tasks queued.").block(Block::default().borders(Borders::ALL).title("SELECTED")));
            frame.render_widget(detail, body[1]);

            let footer = Paragraph::new("↑/↓ select   r refresh   q quit").block(Block::default().borders(Borders::TOP));
            frame.render_widget(footer, chunks[2]);
        })?;

        if event::poll(Duration::from_millis(250))? {
            if let Event::Key(key) = event::read()? {
                match key.code {
                    KeyCode::Char('q') | KeyCode::Esc => break,
                    KeyCode::Up => selected = selected.saturating_sub(1),
                    KeyCode::Down => { if selected + 1 < snapshot.tasks.len() { selected += 1; } }
                    _ => {}
                }
            }
        }
    }
    Ok(())
}
